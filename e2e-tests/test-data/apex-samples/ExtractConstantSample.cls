public with sharing class ExtractConstantSample {
    // A method with a string-literal sub-expression. Extract Constant is gated
    // (Jorje parity) to literal expressions, and `'greeting'` is a literal, so
    // the "Extract constant" action is offered here and the extracted constant
    // infers to String.
    public String greet() {
        String message = 'greeting';
        return message;
    }
}
