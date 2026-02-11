global class ReadOnlyValid {
    @ReadOnly
    @RemoteAction
    global static String getData() {
        return 'data';
    }
}
