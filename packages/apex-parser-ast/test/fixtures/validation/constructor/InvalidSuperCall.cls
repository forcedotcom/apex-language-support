public class InvalidSuperCall {
    public InvalidSuperCall() {
        // Error: super() must be the first statement
        System.debug('Before super');
        super();
    }
}
