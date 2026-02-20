public class InvalidThisCall {
    public InvalidThisCall() {
        // Error: this() must be the first statement
        System.debug('Before this');
        this('test');
    }
    
    public InvalidThisCall(String param) {
    }
}
