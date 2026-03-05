public class InterfaceConflict implements InterfaceConflictInterface {
    public class InterfaceConflictInterface {
    }
    public void method() {
        InterfaceConflictInterface x = new InterfaceConflict.InterfaceConflictInterface();
    }
}
