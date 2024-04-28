<?php
function printr($str){
    echo "<xmp>";
    print_r($str);
    echo "</xmp>";
}

function isLogged(){
    global $gl_applic;
    return (isset($_SESSION[$gl_applic]) && isset($_SESSION[$gl_applic]["userid"]));
}

function login(){
    global $db,$gl_applic;

    $userInfos = json_decode($_POST["userInfos"],true);

    $toReturn = [
        "resp" => "ok",
        "data" => null
    ];

    try{
        $user = $db->doQuery("SELECT username,name,surname,userid FROM users WHERE username=? AND password=?",$userInfos["username"],md5(md5($userInfos["password"])));
        if(count($user) > 0){
            $toReturn["data"] = $user[0];
        }else{
            $toReturn = [
                "resp" => "ko",
                "data" => "Utente non riconosciuto"
            ];
        }
    }catch(Db_Exception $e){
        $toReturn = [
            "resp" => "ko",
            "data" => $e->getMessage()
        ];
    }
    
    return $toReturn;
}

function getLoop(){
    global $db;

    $toReturn = [
        "resp" => "ok",
        "data" => null
    ];

    try{
        $loop = $db->doQuery("SELECT * FROM audio_samples WHERE id=?",$_POST["loopId"]);
        $toReturn["data"] = $loop[0];
    }catch(Db_Exception $e){
        $toReturn = [
            "resp" => "ko",
            "data" => $e->getMessage()
        ];
    }
    
    return $toReturn;
}

function getLoops(){
    global $db;

    $toReturn = [
        "resp" => "ok",
        "data" => null
    ];

    try{
        $samples = $db->doQuery("SELECT * FROM audio_samples WHERE LENGTH(name) > 0 ORDER BY name ASC, genre ASC");
        $genres = $db->doQuery("SELECT DISTINCT genre FROM audio_samples ORDER BY genre ASC");
        $bpms = $db->doQuery("SELECT DISTINCT bpm FROM audio_samples WHERE bpm REGEXP '^[0-9]+$' ORDER BY CAST(bpm AS UNSIGNED INTEGER) ASC");
        $beats = $db->doQuery("SELECT DISTINCT beats FROM audio_samples WHERE beats REGEXP '^[0-9]+$' ORDER BY CAST(beats AS UNSIGNED INTEGER) ASC");
        $sounds = $db->doQuery("SELECT DISTINCT sound FROM audio_samples WHERE LENGTH(sound) > 0 ORDER BY sound ASC");

        $toReturn["data"] = array(
            "samples"   => $samples,
            "filters"   => array(
                "genre"    => array_map(function($item) {return $item['genre'];}, $genres),
                "bpm"      => array_map(function($item) {return $item['bpm'];}, $bpms),
                "beats"    => array_map(function($item) {return $item['beats'];}, $beats),
                "sound"    => array_map(function($item) {return $item['sound'];}, $sounds)
            )
        );
    }catch(Db_Exception $e){
        $toReturn = [
            "resp" => "ko",
            "data" => $e->getMessage()
        ];
    }
    
    return $toReturn;
}
?>