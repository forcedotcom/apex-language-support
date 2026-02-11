global class ReadOnlyUseReplicaNotStatic {
    @ReadOnly(useReplica='preferred')
    @RemoteAction
    global String getData() {
        return 'data';
    }
}
