public class LoopWithQueryLookalikes {
    public void validLoops() {
        for (String value : new List<String>{ '[SELECT Id FROM Account]' });
        for (String value : getQueryLocator());
    }

    private List<String> getQueryLocator() {
        return new List<String>();
    }
}
