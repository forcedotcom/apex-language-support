public with sharing class ExtractVariableSample {
    // A method with a clearly extractable sub-expression. The literal
    // `2 * 3` is a single, well-formed expression inside a method body,
    // which is exactly what the Extract Local Variable refactoring targets.
    // It infers to Integer (Integer * Integer).
    public Integer computeValue() {
        Integer result = 1 + 2 * 3;
        return result;
    }

    // A string literal sub-expression: `'value'` infers to String. (Being a
    // literal it is also eligible for Extract Constant; see ExtractConstantSample.)
    public String describe() {
        String label = 'value';
        return label;
    }

    // A constructor expression: `new Account()` infers to the constructed type
    // `Account` (a non-literal, resolved from the expression alone), exercising
    // that user-defined type casing is preserved.
    public Account makeAccount() {
        Account acct = new Account();
        return acct;
    }
}
