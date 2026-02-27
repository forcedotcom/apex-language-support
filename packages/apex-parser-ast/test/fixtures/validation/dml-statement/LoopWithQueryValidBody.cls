public class LoopWithQueryValidBody {
    public void validLoop() {
        for (Account a : [SELECT Id FROM Account]) {
            System.debug(a);
        }
    }
}
