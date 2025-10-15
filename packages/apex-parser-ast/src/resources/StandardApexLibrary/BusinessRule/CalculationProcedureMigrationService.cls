global class CalculationProcedureMigrationService {
	global Object clone() { }
	global static Map<String,Object> migrate(List<String> calcProcedureIds, String namespace) { }
	global static Map<String,Object> migrate(String calcProcedureId, String namespace) { }

}