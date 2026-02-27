public class ChildWithIncorrectSuperTypes extends ParentWithTypedConstructors {
    public ChildWithIncorrectSuperTypes() {
        // Wrong: passing String when constructor expects Integer
        super(42);
    }
    
    public ChildWithIncorrectSuperTypes(String name) {
        // Wrong: passing String when constructor expects Integer
        super(123);
    }
    
    public ChildWithIncorrectSuperTypes(Integer count) {
        // Wrong: passing String literal when constructor expects Integer
        super("hello");
    }
    
    public ChildWithIncorrectSuperTypes(String name, Integer count) {
        // Wrong: swapped argument types
        super(count, name);
    }
}
