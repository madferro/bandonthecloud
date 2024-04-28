<?php
require("init.inc");

header("Content-type: application/json; charset=utf-8");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Cookie');

$response = [
    "resp"      => "ok",
    "data"      => null,
    "errorCode" => 200
];

if(!isLogged() && 
    isset($_REQUEST["action"]) && 
    ($_REQUEST["action"] != "login") && 
    ($_REQUEST["action"] != "isLogged") &&
    ($_REQUEST["action"] != "printSession") &&
    ($_REQUEST["action"] != "getLoops")
){
    $response = [
        "resp"      => "ko",
        "data"      => "Utente non autenticato."
    ];
    header("HTTP/1.1 401 Unauthorized");
    echo json_encode($response);
    exit;
}

$action = "";
if(isset($_REQUEST["action"])){
    $action = $_REQUEST["action"];
}

switch($action){
    case "printSession":
        $response["data"] = $_SESSION;
        $response["cookie"] = $_COOKIE;
        echo json_encode($response);
    break;
    case "login":
        $resp = login();
      
        if($resp["resp"] == "ok"){
            session_start();
            $response["data"] = $resp["data"];
            $_SESSION[$gl_applic]["userid"] = $resp["data"]["userid"];
        }else{
            $response = [
                "resp"      => "ko",
                "data"      => $resp["data"],
            ];
            header("HTTP/1.1 401 Unauthorized");
        }
        echo json_encode($response);
    break;
    case "isLogged":
		if(!isLogged()){
            $response = [
                "resp"      => "ko",
                "data"      => "Utente non autenticato.",
                "cookie"    => $_COOKIE
            ];
            header("HTTP/1.1 401 Unauthorized");
        }else{
            $response["data"] = $_SESSION[$gl_applic];
        }
        echo json_encode($response);
        exit;
		break;
    
    case "getLoop":
        echo json_encode(getLoop());
        exit;
        break;

    case "getLoops":
        echo json_encode(getLoops());
        exit;
		break;

    default:
        echo json_encode($_SERVER['REQUEST_METHOD']);
    break;
}
?>