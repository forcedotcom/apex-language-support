public with sharing class ExtractVariableSample {
    // A method with a clearly extractable sub-expression. The literal
    // `2 * 3` is a single, well-formed expression inside a method body,
    // which is exactly what the Extract Local Variable refactoring targets.
    public Integer computeValue() {
        Integer result = 1 + 2 * 3;
        return result;
    }
}
