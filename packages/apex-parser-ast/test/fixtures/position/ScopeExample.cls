public with sharing class ScopeExample {
    String a;

    public ScopeExample() {
    }

    public void method1() {
        String a;
        String b = a;
    }

    public void method2() {
        String a;
        String b = a;
    }

    public void method3() {
        String b = a;
    }
}

