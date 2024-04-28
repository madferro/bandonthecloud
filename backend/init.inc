<?php
if(isset($_COOKIE['PHPSESSID'])){
	session_id($_COOKIE['PHPSESSID']);
	session_start();
}

$root = "./";
require_once($root."db.php");
require_once($root."functions.php");

$gl_applic = "BANDONTHECLOUD";
$globalServerName = "indiredaw.indire.it";
$globalUrl = "https://".$globalServerName."/";

$dbUser 		= "indiredaw";
$dbPwd 			= "Irsa88mo.2021";
$dbServer 		= "dbs-indiredbaas-prd-005m.site01.nivolapiemonte.it";
$dbName 		= "indiredaw";

if($_SERVER["SERVER_NAME"] == "localhost"){
	$dbUser 		= "root";
	$dbPwd 			= "root";
	$dbServer 		= "localhost";
	$dbName 		= "indiredaw";
}

try{
	$db = new db($dbServer,$dbUser,$dbPwd,$dbName);
}catch(db_DbException $e){
	die($e->getMessage());
}
?>