public class ChildWithCorrectSuperTypes extends ParentWithTypedConstructors {
    public ChildWithCorrectSuperTypes() {
        super();
    }
    
    public ChildWithCorrectSuperTypes(String name) {
        super(name);
    }
    
    public ChildWithCorrectSuperTypes(Integer count) {
        super(count);
    }
    
    public ChildWithCorrectSuperTypes(String name, Integer count) {
        super(name, count);
    }
}
