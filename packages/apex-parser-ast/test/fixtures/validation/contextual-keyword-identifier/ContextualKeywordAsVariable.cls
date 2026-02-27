/**
 * Contextual keywords (offset, limit, select, count) used as variable names - VALID.
 * These are keywords in SOQL/SOSL context but valid as identifiers in Apex code.
 * Should NOT produce invalid.keyword.identifier diagnostics.
 */
public class ContextualKeywordAsVariable {
    public void test() {
        Integer offset = 5;
        Integer limit = 10;
        Integer count = 0;
        String select = 'Id';
        List<Account> results = [
            SELECT Id
            FROM Account
            LIMIT :limit
            OFFSET :offset
        ];
    }
}
