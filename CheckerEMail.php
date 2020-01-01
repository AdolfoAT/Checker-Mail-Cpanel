<?php
/*Script que verifica la capacidad de disco de las cuentas de correo electronico en CPanel
* Analiza la informacion y la almacena en Firebase (base de datos en tiempo real de Google) de tipo JSON
* Realiza notificaciones al administrador de alerta correspondiente (cuando una cuenta este por exceder o haya excedido su capacidad)
* por Slack & Correo Electronico (si es que se presenta un error con Slack)
* @autor Adolfo Ascencio Trejo email: adolfo.as.tr.94@gmail.com pachuca202@gmail.com pachux202@live.com.mx
* Tel: 7717468962
* @version 1.0.0 [2 Enero 2020]
*/
define('#CanalSlack','URL del WebHook de Slack');// Del Administrador de CPanel
$limite_correo = 5242880; // 5 Megabytes en bytes de limite Correo
$usuario = $argv[1]; // Asignamiento del primer parametro usuario recibido por consola
$directorio ='/home/'.$usuario.'/.cpanel/email_accounts.json'; //Ruta del archivo de las cuotas de correo en CPanel
$dominio = $argv[2]; // Asignamiento del primer parametro dominio recibido por consola
$Dominio = str_replace(".", "",$dominio); // Quitar el punto(.) para poder hacer la consulta con firebase
$Dominio = str_replace("com","",$Dominio);
$Dominio = str_replace("mx","",$Dominio);
$datos_firebase=consulta_firebase($Dominio); //Consulta de antecentes con firebase
if(file_exists($directorio)) // Condicional si el archivo existe
{
    //Obtener el contenido del archivo
    $cuentas_email = file_get_contents($directorio);
    $cuentas_correo = json_decode($cuentas_email, true);
    //Busqueda de los datos de cada cuenta
    foreach ($cuentas_correo[$dominio]['accounts'] as $cuenta => $datos)
    {
      //Validación de los datos
        if($datos['diskquota'] > 0)
        {
          //Obtener el porcentaje, uso, quota, cuenta de correo
          $porcentaje = round((($datos['diskused']*100)/$datos['diskquota']),0);
          $diferencia_correo = $datos['diskquota']-$datos['diskused'];
          $uso = round(($datos['diskused'] / 1048576),0);
          $capacidad = round(($datos['diskquota'] / 1048576),0);
          $cuenta_correo = $cuenta;
          // Validacion de los datos "a punto de exceder la capacidad " y verficacion de aviso
          if($diferencia_correo <= $limite_correo)
          {
            $texto = ($diferencia_correo > 0 ) ? "Esta por exceder su límite":"Ha excedido su límite";
            $datos_cuenta = array("Cuenta"=>"$cuenta_correo","Uso"=>"$uso","Capacidad"=>"$capacidad","Dominio"=>"$dominio","Porcentaje"=>"$porcentaje","Texto" => $texto, "Status" => "Excedido", "Modificado" => "NO", "Diferencia" => "0");
            validar_datos ($datos_cuenta,$datos_firebase);
          }
          else
          {
              $datos_cuenta = array("Cuenta"=>"$cuenta_correo","Uso"=>"$uso","Capacidad"=>"$capacidad","Dominio"=>"$dominio","Porcentaje"=>"$porcentaje","Texto" => " ","Status" => "Bien", "Modificado" => "NO", "Diferencia" => "0");
              validar_datos ($datos_cuenta,$datos_firebase);
          }
       }
     }
}
else { // Notificación en caso de error
  $mensaje = "Ha ocurrido un error con el archivo de cuentas de correo \r\n";
  notificar_error_slack($mensaje, $dominio);
}
// Funcion para revisar si hay antecedentes de la cuenta, insercion o actualizacion de los datos
function validar_datos($datos_cuenta, $datos_firebase)
{
    $cuenta=$datos_cuenta['Cuenta'];
    if(!isset($datos_firebase[$cuenta])) // Revision si hay antecedentes de la cuenta en firebase
    {
      // No hay antecedentes, se ingresarán a firebase
        if(actualizar_firebase($datos_cuenta))
        {
          if($datos_cuenta['Status'] == 'Excedido')
          {
            // Notifica sobre el correo excedido insertado en firebase
            notificarslack($datos_cuenta, true, "Nada");
          }
        }
        else {
          // Notifica un error
          notificar_error_slack("Ha ourrido un error al actualizar la base de datos de firebase \r\n",$datos_cuenta['Dominio']);
        }
    }
    else
    {
      if($datos_firebase[$cuenta]['Modificado'] == 'SI')
        $datos_cuenta['Modificado']="SI";
      // Si hay antecedentes, revisa si hay algun cambio en la capacidad de la cuenta
      if($datos_cuenta['Capacidad'] != $datos_firebase[$cuenta]['Capacidad(MB)'])
      {
        $datos_cuenta['Diferencia']=$datos_cuenta['Capacidad'] - $datos_firebase[$cuenta]['Capacidad(MB)'];
        $datos_cuenta['Texto']="Esta cuenta ha cambiado su capacidad de almacenamiento";
        $datos_cuenta['Modificado']="SI";
        if(actualizar_firebase($datos_cuenta))
        {
          notificarslack($datos_cuenta, false, $datos_firebase[$cuenta]['Capacidad(MB)']);
        }
        else {
          // Notifica un error
          notificar_error_slack("Ha ourrido un error al actualizar la base de datos de firebase \r\n",$datos_cuenta['Dominio']);
        }
      }
      else
      {
        // Si hay antecedentes en firebase
        if($datos_firebase[$cuenta]['Status']=='Proceso' && $datos_cuenta['Status']=='Excedido')
        {
          $datos_cuenta['Status']='Proceso';
          if(!actualizar_firebase($datos_cuenta))
          {
            // Notifica un error
            notificar_error_slack("Ha ourrido un error al actualizar la base de datos de firebase \r\n",$datos_cuenta['Dominio']);
          }
        }
        else
        if($datos_cuenta['Status']=='Bien')
        {
          if(!actualizar_firebase($datos_cuenta))
          {
            //Notificar error
            notificar_error_slack("Ha ourrido un error al actualizar la base de datos de firebase \r\n",$datos_cuenta['Dominio']);
          }
        }
      }
    }
}
//Funcion para consultar antecedentes en Google Firebase
function consulta_firebase($dominio){
  $url = "https://basedatos.firebaseio.com/".$dominio.".json"; // URL de firebase
  $curl = curl_init();
  curl_setopt($curl,CURLOPT_URL, $url);
  curl_setopt($curl,CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($curl,CURLOPT_RETURNTRANSFER, true);
  $respuesta  = curl_exec($curl); // Guardar datos de la consulta
  $datos_consulta = array();
  if(curl_errno($curl))
  {
    // Ha ocurrido un error, se hara la notificacion correspondiente
    notificar_error_slack("Error en la consulta de firebase", $dominio);
  }
  else {
    $datos_consulta=json_decode($respuesta,true); // Datos de la consulta decodificados.
  }
  curl_close($curl);
  return $datos_consulta;
}

//Funcion para inserar o actualizar datos en firebase
function actualizar_firebase($datos_cuenta)
{
  $Cuenta = $datos_cuenta['Cuenta'];
  $Dominio = str_replace(".", "",$datos_cuenta['Dominio']); // Quitar el punto(.) para poder hacer la actualizacion con firebase
  $Dominio = str_replace("com","",$Dominio);
  $Dominio = str_replace("mx","",$Dominio);
  $Fecha = new DateTime("now");
  $Hoy = $Fecha -> format('d-m-Y');
  $url="https://basedatos.firebaseio.com/".$Dominio.".json";
  $Datos='{"'.$Cuenta.'":{"Uso(MB)":"'.$datos_cuenta['Uso'].'" ,"Capacidad(MB)":"'.$datos_cuenta['Capacidad'].'","Dominio":"'.$datos_cuenta['Dominio'].'" ,"Fecha":"'.$Hoy.'" ,"Porcentaje(%)":"'.$datos_cuenta['Porcentaje'].'","Status":"'.$datos_cuenta['Status'].'","Modificado":"'.$datos_cuenta['Modificado'].'","Diferencia":"'.$datos_cuenta['Diferencia'].'"}}';
  $curl=curl_init();
  curl_setopt($curl,CURLOPT_URL, $url);
  curl_setopt($curl,CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($curl,CURLOPT_RETURNTRANSFER, true);
  curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PATCH" );
  curl_setopt($curl, CURLOPT_POSTFIELDS, $Datos);
  curl_exec($curl);
  if(curl_errno($curl))
  {
    return false;
  }
  else {
    return true;
  }
  curl_close($curl);
}
// Funcion para hacer notificaciones por SLACK recibe los datos, el tipo de mensaje y el dominio
function notificarslack($datos_cuenta, $status, $dif){
  $fecha = new DateTime("now");
  $time_stamp = $fecha -> getTimestamp();
  $cuenta = $datos_cuenta['Cuenta'];
  $capacidad=$datos_cuenta['Capacidad'];
  $uso=$datos_cuenta['Uso'];
  $porcentaje= $datos_cuenta['Porcentaje']."%";
  $dominio=$datos_cuenta['Dominio'];
  $texto=$datos_cuenta['Texto'];
  if($status)
  {
    $message = '{
                    "attachments":
                  [
                     {
                        "fallback": "'.$cuenta.' '.$texto.'",
                        "color": "#FF8000",
                        "author_name": "'.$dominio.'",
                        "title": "Notificación de límite de capacidad",
                        "fields": [
                                      {"title": "Cuenta","value": "'.$cuenta.'","short": true},
                                      {"title": "Porcentaje (%)","value": "'.$porcentaje.'","short": true},
                                      {"title": "Capacidad (MB)","value": "'.$capacidad.'","short": true},
                                      {"title": "Uso (MB)","value": "'.$uso.'","short": true}
                                  ],
                        "footer": "Email-Notification",
                        "ts": '.$time_stamp.'
                    }
                  ]
                }';
  }
  else {
    $message = '{
                    "attachments":
                  [
                     {
                        "fallback": "'.$cuenta.' '.$texto.'",
                        "color": "#00BFFF",
                        "author_name": "'.$dominio.'",
                        "title": "Cambio de capacidad",
                        "fields": [
                                      {"title": "Cuenta","value": "'.$cuenta.'","short": false},
                                      {"title": "Capacidad Anterior (MG)","value": "'.$dif.'","short": true},
                                      {"title": "Capacidad Actual (MG)","value": "'.$capacidad.'","short": true},
                                      {"title": "Uso (MB)","value": "'.$uso.'","short": true}
                                  ],
                        "footer": "Email-Notification",
                        "ts": '.$time_stamp.'
                    }
                  ]
                }';
  }
  // Envia el mensaje con curl
  $curl = curl_init(#CanalSlack);
  curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($curl, CURLOPT_POST, true);
  curl_setopt($curl, CURLOPT_POSTFIELDS, $message);
  curl_exec($curl);
  if(curl_errno($curl))
  {
    // Notificar si hay un error con SLACK por correo electronico al administrador
    mail("correo@dominio.com","Ha ourrido un error con las notificaciones por SLACK", curl_errno($curl));
  }
  curl_close($curl);
}
// Funcion error para notificar un error
function notificar_error_slack($Mensaje, $dominio){
  $fecha = new DateTime("now");
  $time_stamp = $fecha -> getTimestamp();
  $error = '{
      "attachments":
    [
       {
          "color": "#FF0000",
          "author_name": "'.$dominio.'",
          "title": "Alerta",
          "text":"'.$Mensaje.'",
          "footer": "Email-Notification",
          "ts": '.$time_stamp.'
      }
    ]
  }';
  // Envia el mensaje con curl
  $curl = curl_init(Inbox);
  curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($curl, CURLOPT_POST, true);
  curl_setopt($curl, CURLOPT_POSTFIELDS, $error);
  curl_exec($curl);
  if(curl_errno($curl))
  {
    // Notificar si hay un error con SLACK por correo electronico al administrador
    mail("correo@dominio.com","Ha ourrido un error con las notificaciones por SLACK", curl_errno($curl).$error);
  }
  curl_close($curl);
}
?>
