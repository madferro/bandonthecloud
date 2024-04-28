<?php
class db_DbException extends Exception {
    function __construct() {
        if(func_num_args() == 0)
        {
            $this->message = "Errore sconosciuto";
        }
        else if(is_array(func_get_arg(0)))
        {
            $e = func_get_arg(0);
            $this->message = " <br>\n" . $e['message'] . " <br>\n" . "Query: '" . $e['sqltext'] . "' <br>\n" . "in posizione " . $e['offset'] . " <br>\n";
        }
        else
        {
            $message = func_get_arg(0);
            $sqltext = func_get_arg(1);
            $this->message = " <br>\n" . $message . " <br>\n" . "Query: '" . $sqltext . "' <br>\n";
        }
    }
} // class db_DbException

//------------------------------------------------------------------------------
// class db
//------------------------------------------------------------------------------
class db {

    protected $conn = false;

    /**---------------------------------------------------------------------------
     * Costruttore Esegue la connessione al DB
     * @param $username     : Oracle user name
     * @param $password     : Password per $username
     * @param $dbname       : Nome database (localhost/XE per Oracle Express)
     * @param $codpage      : opzionale: codifica da usare per il client
     * @return NULL
     ----------------------------------------------------------------------------*/
    function __construct($dbserver, $username, $password, $dbname){
        //$this->conn = @oci_connect($username, $password, $dbname, $codpage);
        $this->conn = new mysqli($dbserver, $username, $password, $dbname);
        if (!($this->conn)) {
            $e = $this->conn->connect_error;
            throw new db_DbException($e,null);
        }
        $this->conn->autocommit(FALSE);
     }

    function __destruct() {
        if ($this->conn) {
            $this->conn->close();
        }
    }


    public function getConnection() {
        return $this->conn;
    }

    public function commit() {
        if ($this->conn) {
            if (!$this->conn->commit()) {
                $e = $this->conn->error;
                throw new db_DbException($e);
            }
        }
    }

    public function rollback() {
        if ($this->conn) {
            if (!$this->conn->rollback()) {
                $e = $this->conn->error;
                throw new db_DbException($e);
            }
        }
    }


	private function getTypeParam($param)
	{
		$type = "s";
		if(is_int($param))
		{
			$type =	"i"; 
		}	
		if(is_double($param))
		{
			$type =	"d";
		}	
		if(strlen($param)>255)
		{
			$type =	"b";			
		}
		return $type;
	}

	private function stmt_bind_assoc(&$stmt, &$out) {
		$data = $stmt->result_metadata();
		$fields = array();
		$out = array();

		$count = 1;
		
		
		while($field = $data->fetch_field()) {
			$fields[$count] = &$out[$field->name];
			$count++;
		}    
		$stmt->store_result();
		call_user_func_array(array($stmt,"bind_result"), $fields);
	}
	
	private function executeSelect($sql,$arr)
	{
		$arr = func_get_args();
		$stmt = $this->conn->prepare($sql);
		$typeParam = "";
		
		if(!$stmt){
			$e = "stmt false";
			throw new db_DbException($e,"");
		}
		
		if(count($arr[1])>1)
		{
			for($i = 1; $i < count($arr[1]); $i++){
				
				$typeParam .= $this->getTypeParam($arr[1][$i]);
			}
			
			$arrP[0] = $typeParam;

			for($i = 1; $i < count($arr[1]); $i ++){
				$arrP[$i] = &$arr[1][$i];
			}
			//call_user_func_array("$stmt->bind_param", array($typeParam,$arr[1]));
			call_user_func_array(array($stmt,"bind_param"), $arrP);
		}
		
		if(!$stmt->execute())
		{
            $e = $stmt->error;
            throw new db_DbException($e,$sql);
		}
		
		$row = array();
		
		$this->stmt_bind_assoc($stmt, $row);
		
		$n = 0;
		$arrRow = array();
		while ($stmt->fetch()) {
			foreach($row as $key => $val){		
				$arrRow[$n][$key] = $val;
			}
			//print_r($row);
			$n++;
		}
		return $arrRow;
	}

	private function execute($sql,$arr)
	{
		$arr = func_get_args();
		if(!$stmt = $this->conn->prepare($sql)){
			$e = $this->conn->error;
            throw new db_DbException($e,$sql);	
		}
		
		if(count($arr[1])>1)
		{
			for($i = 1; $i < count($arr[1]); $i++){
				$typeParam .= $this->getTypeParam($arr[1][$i]);
			}
			
			$arrP[0] = $typeParam;
			for($i = 1; $i < count($arr[1]); $i ++){
				$arrP[$i] = &$arr[1][$i];
			}
		
			//call_user_func_array("$stmt->bind_param", array($typeParam,$arr[1]));
			call_user_func_array(array($stmt,"bind_param"), $arrP);
		}
		if(!$stmt->execute())
		{
			$this->conn->rollback();
            $e = $stmt->error;
            throw new db_DbException($e,$sql);
		}
		/*else
		{
			$this->conn->commit();	
		}*/

		return $stmt->affected_rows;
	}
	
	public function doQuery(){
		$arr = func_get_args();
		
		if(strpos(trim(strtolower("#".$arr[0])),"select")){
			return $this->executeSelect($arr[0],$arr);
		}else{
			return $this->execute($arr[0],$arr);
		}
	}

    public function select(){
	    $arr = func_get_args();
		return $this->executeSelect($arr[0],$arr);
    } 

    public function update(){
        $arr = func_get_args();
        return $this->execute($arr[0],$arr);
    }

    public function insert(){
        $arr = func_get_args();
    	return $this->execute($arr[0],$arr);
    }

    public function delete(){
        $arr = func_get_args();
        return $this->execute($arr[0],$arr);
    }
    
    public function last_id(){
	    return $this->conn->insert_id;
    }

}
?>