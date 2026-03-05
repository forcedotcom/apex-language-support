public class ValidConstructorWithSuper {
    // Inner class as parent
    public virtual class Parent {
    }
    
    // Inner class extending parent - valid super() call
    public class Child extends Parent {
        public Child() {
            // Valid: super() is the first statement and class extends Parent
            super();
            System.debug('After super');
        }
    }
}
