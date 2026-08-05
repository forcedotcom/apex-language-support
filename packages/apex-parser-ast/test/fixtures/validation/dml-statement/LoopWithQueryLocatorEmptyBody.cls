public class LoopWithQueryLocatorEmptyBody {
    public void invalidLoop() {
        for (Account account : Database.getQueryLocator([SELECT Id FROM Account]));
    }
}
