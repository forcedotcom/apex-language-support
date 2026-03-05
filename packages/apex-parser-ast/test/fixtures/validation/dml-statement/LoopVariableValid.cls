public class LoopVariableValid {
    public void validLoop() {
        for (Account a : [SELECT Id FROM Account]) {
            System.debug(a.Name);
        }
        for (SObject s : [SELECT Id FROM Account]) {
            System.debug(s);
        }
    }
}
