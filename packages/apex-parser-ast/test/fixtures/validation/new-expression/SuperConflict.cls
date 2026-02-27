public class SuperConflict extends SuperConflictParent {
    public class SuperConflictParent {
    }
    public void method() {
        SuperConflictParent x = new SuperConflict.SuperConflictParent();
    }
}
