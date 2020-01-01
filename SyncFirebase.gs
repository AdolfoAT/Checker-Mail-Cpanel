/*
 * Script de Sincronización Bidireccional de Google Firebase & Google Sheets
 * Obtiene datos nuevos de la base de datos de Google firebase(base de datos en tiempo real tipo json)
 * e inserta el nuevo contenido en Google Sheets (Hoja de calculo de Google).
 * Envia un correo electronico de alerta automatizado al usuario en caso de que este por exceder su limite
 * Envia notificacion al administrador cuando se tenga que incrementar la capacidad de la cuenta y poder notifical al ucuario
 * @autor Adolfo Ascencio Trejo email: adolfo.as.tr.94@gmail.com pachuca202@gmail.com pachux202@live.com.mx
 * Tel: 7717468962
 * @version 1.0.0 [2 Enero 2020]
 */
function SyncFireToSheet(){
  Logger.log("Inicio");
  // Consulta con FireBase
  var FireBaseUrl = "https://basedatos.firebaseio.com/";
  // Obtencion y decoficacion de los datos de Firebase
  var Data = FirebaseApp.getDatabaseByUrl(FireBaseUrl);
  var DatosFireBase = Data.getData();
  var ContadorCuentas = 1;
  var ContadorDominios = 1;
  var ListaDominios = "";
  var DominioAux;
  var ContCuentas=0;
  var ContCapacidad=0;
  var ListaCorreos = "";
  var Dom;
  // Recorrido del JSON de FireBase
  for(var Dominio in DatosFireBase) {
    var DominioA = false;
    ContCuentas=0;
    ContCapacidad=0;
    for(var Cuenta in DatosFireBase[Dominio]){
      var Dominio2 = DatosFireBase[Dominio][Cuenta]['Dominio'];
      var Cuenta2 = Cuenta+'@'+Dominio2;
      var Fecha = DatosFireBase[Dominio][Cuenta]['Fecha'];
      var Capacidad = DatosFireBase[Dominio][Cuenta]['Capacidad(MB)'];
      var Uso = DatosFireBase[Dominio][Cuenta]['Uso(MB)'];
      var Porcentaje = DatosFireBase[Dominio][Cuenta]['Porcentaje(%)'];
      var Status = DatosFireBase[Dominio][Cuenta]['Status'];
      var Modificado = DatosFireBase[Dominio][Cuenta]['Modificado'];
      var Diferencia = DatosFireBase[Dominio][Cuenta]['Diferencia'];
      // Obtencion de los datos de cada cuenta
      var DatosFireBaseCuenta=[Dominio2, Cuenta2, Capacidad, Uso, Porcentaje, Fecha, Status, Modificado, Diferencia];
      ContCuentas++;
      ContCapacidad += parseInt(Capacidad);
      Dom = Dominio2;
      // Actualziacion de Sheet "Individual"
      if(ActualizarSheetIndividual(DatosFireBaseCuenta))
      {
        //Registro de insesiones que requieren la atencion del administrador
        ListaCorreos += ContadorCuentas + ". " + Cuenta2 + "\n"
        DominioAux = Dominio2;
        DominioA=true;
        ContadorCuentas ++;
      }
    }
    // Registro de datos para reporte "General"
    var datosDominio = {
           'Dominio': Dom,
           'Capacidad': ContCapacidad,
           'NCuentas': ContCuentas
         };
         // Actualizacion del la Sheet General
     ActualizarSheetGeneral(datosDominio);
    if(DominioA)
    {
      ListaDominios += "• " +DominioAux+"\n";
      ContadorDominios  ++;
    }
  }
  //Validacion y notificacion de cuentas que requieren la atencion del administrador
  if(ContadorCuentas  != 1)
  {
     sendSlackMessage(ListaCorreos,ListaDominios,ContadorCuentas,ContadorDominios);
  }
  Logger.log("Fin");
}

// Funcion para Actualizar la Hoja de Calculo
function ActualizarSheetIndividual(DatosCuenta){
  var Respuesta = false;
  var Sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reporte Individual");
  // Obtener rango de valores de la Sheet
  var Rango = Sheet.getDataRange();
  // Obtener los valores de acuerdo al rango obtenido
  var DatosSheet = Rango.getValues();
  var Cabesera = DatosSheet.shift();
  var Encontrado=false;
  var mensaje = "";
  var contador = 0;
  // Creacion de un map para el control datos de la Sheet
  var DataSheet = DatosSheet.map(function(values) {
    return Cabesera.reduce(function(o, k, i) {
      o[k] = values[i];
      return o;
    }, {});
  });

  //  Busqueda del registro en el mapa
  DataSheet.forEach(function(row, rowIdx){
    // Si hay un registro previo
    if (row.Cuenta==DatosCuenta[1]){
      Encontrado=true;
      // Si el registro es encontrado sobreescribe el arreglo
      DatosSheet[rowIdx][2] = DatosCuenta[2];
      DatosSheet[rowIdx][3] = DatosCuenta[3];
      DatosSheet[rowIdx][4] = DatosCuenta[4];
      DatosSheet[rowIdx][5] = DatosCuenta[5];
      DatosSheet[rowIdx][6] = DatosCuenta[6];
      DatosSheet[rowIdx][7] = DatosCuenta[7];
      DatosSheet[rowIdx][8] = DatosCuenta[8];
      var resta = DatosCuenta[2]-DatosCuenta[3];
      // Validacion si esta por exeder y no se ha notificado al usuario previamente
      if(resta <=5 && DatosSheet[rowIdx][9]=="")
      {
        if(resta > 0)
        {
          var mail = DatosCuenta[1];
          sendMail(mail); // notificicacion al usuario
          // Crear JSON para actualizar firebase
          var fecha=getDate();
          var datosImportarFire = {};
          // Registro de notificacion
          DatosSheet[rowIdx][9] = fecha;
          DatosSheet[rowIdx][6] = "Proceso";
          var Dominio = DatosCuenta[0];
          var Dominio2 = Dominio.replace(/\..*/,"");
          var Cuenta = DatosCuenta[1].replace(/@.*/,"");
          datosImportarFire[Cuenta] = {
             'Capacidad(MB)': DatosCuenta[2],
             'Uso(MB)': DatosCuenta[3],
             'Porcentaje(%)': DatosCuenta[4],
             'Fecha': DatosCuenta[5],
             'Status': "Proceso",
             'Modificado': DatosCuenta[7],
             'Diferencia': DatosCuenta[8],
             'Dominio': Dominio
           };
          //Actualizacion de FireBase
          updateFireBase(Dominio2, datosImportarFire);
          Logger.log("Correo Enviado: " + fecha);
          Respuesta = false;
        }
        else
        {
          Respuesta = true;
        }
      }
      // Actualizacion en la Sheet
      Rango.offset(1, 0, DatosSheet.length).setValues(DatosSheet);
    }
   });
   // Registro nuevo
   if(!Encontrado)
   {
     //Ajuste de los datos
      var Dominio = DatosCuenta[0];
      var Cuenta =  DatosCuenta[1];
      var Capacidad =  DatosCuenta[2];
      var Uso = DatosCuenta[3];
      var Porcentaje = DatosCuenta[4];
      var Fecha = DatosCuenta[5];
      var Status = DatosCuenta[6];
      var Modificado = DatosCuenta[7];
      var Diferencia = DatosCuenta[8];
      // Validacion del estatus
      if(Status == "Excedido")
      {
        if((Capacidad - Uso) > 0 )
        {
          // Noficacion al usuario
          sendMail(Cuenta);
          var fecha=getDate();
          Status = "Proceso";
          // Nueva insecion de datos en la Sheet
          Sheet.appendRow([Dominio, Cuenta, Capacidad, Uso, Porcentaje, Fecha, Status, Modificado, Diferencia, fecha]);
          Logger.log("Correo Enviado: " + fecha);
          Respuesta = false;
        }
        else
        {
          Respuesta = true;
        }
      }
      else
      {
        // Insercion de un registro con status normal
        Sheet.appendRow([Dominio, Cuenta, Capacidad, Uso, Porcentaje, Fecha, Status, Modificado, Diferencia]);
      }
   }
  return Respuesta;
}

// Funcion para Actualizar la Hoja de Calculo
function ActualizarSheetGeneral(DatosDominio){

  var Sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reporte General");
  // Obtener rango de valores de la Sheet
  if (Sheet != null)
  {
    var Rango = Sheet.getDataRange();
    // Obtener los valores de acuerdo al rango obtenido
    var DatosSheet = Rango.getValues();
    var Cabesera = DatosSheet.shift();
    var Encontrado=false;
    // Creacion de un arreglo 2d para el control datos de la Sheet
    var DataSheet = DatosSheet.map(function(values) {
      return Cabesera.reduce(function(o, k, i) {
        o[k] = values[i];
        return o;
      }, {});
    });
    //  Busqueda del registro en el arreglo 2d
    DataSheet.forEach(function(row, rowIdx){
      if (row.Dominio==DatosDominio['Dominio']){
        Encontrado=true;
        // Si el registro es encontrado sobreescribe el arreglo
        DatosSheet[rowIdx][2] = DatosDominio['NCuentas'];
        DatosSheet[rowIdx][3] = DatosDominio['Capacidad'];
        Rango.offset(1, 0, DatosSheet.length).setValues(DatosSheet);
      }
    });
    // Acomodo de los datos para una nueva insecion en la Sheet General
    if(!Encontrado)
    {
      var Dominio = DatosDominio['Dominio'];
      var Limite =  0;
      var NCuentas =  DatosDominio['NCuentas'];
      var UsoCorreos = DatosDominio['Capacidad'];
      var Web = 0;
      var Capacidad = 0;
      var UsoDisco = 0;
      var Status = "Indefinido";
      var Porcentaje = 0;
      var fecha=getDate();
      Sheet.appendRow([Dominio, Limite, NCuentas, UsoCorreos, Web, Capacidad, UsoDisco, Porcentaje]);
    }
  }
  else
  // Actualizacion de los datos de la Sheet General
  {
     var Dominio = DatosDominio['Dominio'];
     var Limite =  0;
     var NCuentas =  DatosDominio['NCuentas'];
     var UsoCorreos = DatosDominio['Capacidad'];
     var Web = 0;
     var Capacidad = 0;
     var UsoDisco = 0;
     var Status = "Indefinido";
     var Porcentaje = 0;
     Sheet.appendRow([Dominio, Limite, NCuentas, UsoCorreos, Web, Capacidad, UsoDisco, Porcentaje]);
  }
}
// Envia notificacion via correo electronico al usuario
function sendMail(email)
{
  var emailAddress = email;
  var message = "Hola,\nBuen día, el motivo de este correo es para informarle que está por exceder el límite de capacidad de su cuenta de correo, le pedimos borre correos antiguos o que ya no necesita tanto de su bandeja de entrada, de salida y la papelera para liberar espacio y no tenga algún problema en el envio y recepcción de correos. \nQuedamos al pendiente.\nSaludos.";
  var subject = "Capacidad de correos";
  MailApp.sendEmail(emailAddress, subject, message);
}
// Obtiene fecha segun el formato correspondiente
function getDate()
{
  var Fecha = new Date();
  var mes = Fecha.getMonth()+1;
  var anio = Fecha.getFullYear();
  var dia = Fecha.getDate();
  if(dia<10) dia='0'+ String(dia);
  if(mes<10) mes='0'+ String(mes);
  var fecha = dia+'-'+mes+'-'+anio;
  return fecha;
}
// Actualiza la base de datos de Google Firebase
function updateFireBase(Dominio, Datos){
  var FireBaseUrl = "https://basedatos.firebaseio.com/";//URL de Firebase
  var base = FirebaseApp.getDatabaseByUrl(FireBaseUrl);
  base.updateData(Dominio, Datos);
}
// Envia notificacion al adminsitrador que requieren atencion
function sendSlackMessage(LCuentas,LDominios,CCuentas,CDominios) {
  var SLACK_URL = "#URL SLACK WebHook"; // URL del WebHook de SLACK
  var text = "*Lista de dominios:* \n"+LDominios+"\n *Incrementar las siguientes cuentas:*  \n"+ LCuentas + "\n";
  var fields = [
    {"title": "Dominios Afectados: ", "value": CDominios,"short" : true},
    {"title": "Cuenta de correos: ", "value": CCuentas, "short" : true}
  ];
  var attachments = {
      "fallback": "Incrementar capacidad Correos",
      "color": "#FF0000",
      "title": "Incrementar capacidad Correos",
      "text": text + "\n",
      "fields":fields,
      "footer": "Email-Notification",
      "ts": parseInt(Date.now()/1000),
      "mrkdwn_in": ["text"]
  };
  var slackMessage = {
    "attachments": [attachments]
  };
    var options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(slackMessage)
  };
  UrlFetchApp.fetch(SLACK_URL, options);
}
