public class LoopWithQueryEmptyBody {
    public void invalidLoop() {
        for (Account a : [SELECT Id FROM Account]);  // LOOP_WITH_QUERY_REQUIRES_STATEMENT
    }
}
