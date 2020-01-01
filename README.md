# Checker-Mail-Cpanel

Es un conjunto de Scripts que permiten la automatización, verificación, notificación, manejo y control de la cuentas de correo de cada dominio alojados en Digital Server.

# Parte 1. "Control y manejo de cuentas excedidas o por exceder"
En la parte 1 del repositorio que esta conformada por 2 Scripts **CheckerEMail.php** & **SynFirebaseExceeded.js** que son para tener un registro, notificación, control y manejo de las cuentas que hayan excedido o estén por exceder su capacidad de almacenamiento pertenecientes a cada dominio.
##1. CheckerEMail.php

Script para verificar la capacidad de las cuentas de correo electrónico, almacenar los datos de las mismas en Google Firebase, alerta por Slack y correo electrónico (cuando Slack falle) sobre las cuentas que estén por exceder o hallan excedido su capacidad de almacenamiento de  correos.

### Configuración e implementación del Script en **Cpanel -> CronJobs**
Comando:

 ```/usr/local/bin/php /home/(User)/Checker-E-Mail/CheckerEMail.php *User* *Domain*```

Parte 1 del comando:
 ```/usr/local/bin/php```
Es el directorio del programa que ejecutara el script en este caso es PHP para mas información consultar [PHP desde la línea de comandos](http://php.net/manual/es/features.commandline.php)

Parte 2 del comando:
 ```/home/(User)/public_html/Checker-E-Mail/CheckerEMail.php *User* *Domain*```
Es el directorio del script a ejecutar:

      Donde (User) sin parentesis es la carpeta del usuario del dominio, y se sustituira por el nombre del usuario donde sera ejecutado.
      Donde *Domain* (sin ateriscos) es un parametro ejecutado por consola de comandos (CLI), y se sustituira por el dominio donde sera ejecutado.
      Donde *User* (sin ateriscos) es un parametro ejecutado por la consola de comandos (CLI), y se sustuira por el nombre del usuario donde sera ejecutado.

Para mas información consultar [PHP desde la línea de comandos](http://php.net/manual/es/features.commandline.php)

### ¿Como funciona el script?

* 1. Obtención de los datos desde el archivo que aloja los datos de los correos electrónicos(email_accounts.json) en CPanel de cada dominio.
* 2. De-codificación de los mismos.
* 3. Obtención y ajuste de los datos de las cuentas de correo, capacidad total, capacidad de uso, porcentaje de uso de los datos decodificados.
* 4. Validación del uso de cada cuenta de correo en el dominio correspondiente (No este por exceder 5mb limite o ya haya excedido su capacidad).
* 5. Verificación de antecedentes de las cuentas en Firebase.
* 6. Notificar cuando haya algún nuevo registro que requiera la atencion del administrador (Correo nuevo ) en Firebase.
* 7. Actualización o Inserción de datos en Firebase (Dependiendo el caso).
* 9. En caso de algún error se hará la notificación correspondiente.

### ¿Comó modificar parametros en caso de ser necesarios?

* 1. Modificar la URL de las notificaciones de SLACK
   En el Script esta definida una constante llamada SLACK_WEBHOOK, para cambiar la URL solo es necesario sustituir el valor de la constante por la nueva URL, dicha nueva URL es proporcionada por la API de Slack.
* 2. Modificar el limite de correo
   Para modificar el limite de correo es necesario modificar la variable $limite_correo, el valor  tiene que ser en bytes.
* 3. Modificar el directorio del archivo email_accounts.json
   El directorio esta formado de una concatenacion de cadenas y una variable (Solo cambiar este directorio, si cambia el directorio en Cpanel). Para cambiar el directorio solo es necesario sustituir el valor de la variable $directorio por el nuevo directorio.
* 4. Modificar la URL del Firebase
   La URL de Firebase es una concatenacion de la URL y la variable $dominio, para poder crear los nodos hijos dentro del dominio en firebase, para sustituir la variable solo hay que cambiar la URL actual por la nueva URL, es necesario concatenar la variable $dominio dentro de la nueva URL para crear los nodos (hijos) dentro del Dominio(Padre).

## 2. SynFirebase.gs

Script para la sincronización de Google Firbase a Google Sheet, para la Inserción y/o Actualización de los registros en Google Sheet

### Configuración e implementación del Script en Sheet de Google
* 1 Creación de una hoja de calculo
* 2 Clic en **Herramientas -> Editor de secuencias de comandos**
* 3 Copiar el contenido del Script del repositorio al script de Google Scripts
* 4 Modifica la URL de la base de datos de Google FireBase
* 5 Modifica la URL del WeebHook de SLACK
* 4 Ejecuta y autoriza permisos de ejecución
* 5 Crea un activador(para ejecucion automatica basada en eventos o en tiempo) desde el proyecto en https://script.google.com/home.

### Parametros configurables en el Script

 URL de Firbase que hace la conexión esta como la valriable  
 **FireBaseURL**
 Visita para mas informacion: https://sites.google.com/site/scriptsexamples/new-connectors-to-google-services/firebase/tutorials/read-and-write-data-in-firebase-from-apps-script


 URL del WeebHook de SLACK
 **SLACK_URL**
Visita para mas informacion: https://api.slack.com/messaging/webhooks

### ¿Comó funciona el Script?

* 1. Hace una consulta a FireBase de los datos a traves de la URL proporcionada
* 2. Decofica el resultado de la consulta para trabajar con los datos
* 3. Obtención de los datos de cada cuenta
* 4. Verificación de antecedentes de los datos en Google Sheet
* 5. Inserción o Actualización de un registro en Google Sheet (Dependiendo el caso).
