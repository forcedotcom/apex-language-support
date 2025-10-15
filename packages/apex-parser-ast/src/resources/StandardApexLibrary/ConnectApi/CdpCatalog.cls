global class CdpCatalog {
	global Object clone() { }
	global static ConnectApi.CdpLineageOutputRep getLineage(String entityType, String entityName, Integer upstreamDepth, Integer downstreamDepth, String dataspace) { }

}