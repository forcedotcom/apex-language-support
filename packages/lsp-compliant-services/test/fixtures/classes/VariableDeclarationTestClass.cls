public with sharing class VariableDeclarationTestClass {
    @TestVisible
    private static AccountModelHealthCheckVMapper instance;
    
    public static VariableDeclarationTestClass getInstance() {
        if (instance == null) {
            instance = new VariableDeclarationTestClass();
        }
        return instance;
    }
}
