global class CdpLineageOutputRep {
	global List<ConnectApi.CdpLineageEdgeOutput> downstreamEdges;
	global ConnectApi.CdpLineageOutput entity;
	global List<ConnectApi.CdpLineageOutput> nodes;
	global List<ConnectApi.CdpLineageEdgeOutput> upstreamEdges;
	global CdpLineageOutputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}