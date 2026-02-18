/**
 * Non-contextual keyword 'if' used as variable name - INVALID.
 * Should produce invalid.keyword.identifier diagnostic.
 */
public class InvalidKeywordAsVariable {
    public void test() {
        Integer if = 1;
    }
}
