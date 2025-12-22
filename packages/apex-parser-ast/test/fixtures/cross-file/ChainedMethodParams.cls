public class ChainedMethodParams {
    // Test fixture for chained method calls used as method parameters
    
    public void testSimpleTwoLevelChain() {
        // Simple 2-level chain: URL.getOrgDomainUrl().toExternalForm()
        HttpRequest request = new HttpRequest();
        request.setHeader(
            'http-referer',
            URL.getOrgDomainUrl().toExternalForm()
        );
    }
    
    public void testThreeLevelChain() {
        // 3-level chain: a.b().c()
        String result = processChain(
            Account.SObjectType.getDescribe().getName()
        );
    }
    
    public void testMultipleChainedParameters() {
        // Multiple chained parameters: method(a.b(), c.d())
        processMultipleChains(
            URL.getOrgDomainUrl().toExternalForm(),
            Account.SObjectType.getDescribe().getName()
        );
    }
    
    public void testMixedParameters() {
        // Mixed parameters: simpleVar, chained call, anotherVar
        String simpleVar = 'test';
        String anotherVar = 'value';
        processMixed(
            simpleVar,
            URL.getOrgDomainUrl().toExternalForm(),
            anotherVar
        );
    }
    
    public void testStaticMethodWithChainedParameter() {
        // Static method with chained parameter
        MyUtilityClass.staticMethod(
            URL.getOrgDomainUrl().toExternalForm()
        );
    }
    
    public void testInstanceMethodWithChainedParameter() {
        // Instance method with chained parameter
        HttpRequest request = new HttpRequest();
        request.setHeader(
            'key',
            URL.getOrgDomainUrl().toExternalForm()
        );
    }
    
    public void testConstructorWithChainedParameter() {
        // Constructor with chained parameter
        MyClass instance = new MyClass(
            URL.getOrgDomainUrl().toExternalForm()
        );
    }
    
    public void testNestedChains() {
        // Nested chains: a.b().c().d()
        processNestedChain(
            Account.SObjectType.getDescribe().getLabel().toLowerCase()
        );
    }
    
    public void testChainedCallInFirstParameter() {
        // Chained call as first parameter
        processFirst(
            URL.getOrgDomainUrl().toExternalForm(),
            'second',
            'third'
        );
    }
    
    public void testChainedCallInMiddleParameter() {
        // Chained call as middle parameter
        processMiddle(
            'first',
            URL.getOrgDomainUrl().toExternalForm(),
            'third'
        );
    }
    
    public void testChainedCallInLastParameter() {
        // Chained call as last parameter
        processLast(
            'first',
            'second',
            URL.getOrgDomainUrl().toExternalForm()
        );
    }
    
    public void testDeeplyNestedChainedCalls() {
        // Deeply nested: a.b(c.d(e.f()).g.h()).i(j())
        // This tests chains within chains within chains
        TestChainA chainA = new TestChainA();
        TestChainC chainC = new TestChainC();
        TestChainE chainE = new TestChainE();
        TestChainJ chainJ = new TestChainJ();
        
        chainA.b(chainC.d(chainE.f()).g().h()).i(chainJ.j());
    }
    
    public void testChainAfterMethodCallWithParameter() {
        // Chain continues after method call with parameter: a.b.c(d()).e
        // Note: e is a property/field, not a method call
        TestChainA chainA = new TestChainA();
        TestChainD chainD = new TestChainD();
        
        TestChainE result = chainA.b().c(chainD.d()).e;
    }
    
    // Helper methods for testing
    private String processChain(String input) {
        return input;
    }
    
    private void processMultipleChains(String first, String second) {
        System.debug(first + second);
    }
    
    private void processMixed(String first, String second, String third) {
        System.debug(first + second + third);
    }
    
    private void processNestedChain(String input) {
        System.debug(input);
    }
    
    private void processFirst(String first, String second, String third) {
        System.debug(first + second + third);
    }
    
    private void processMiddle(String first, String second, String third) {
        System.debug(first + second + third);
    }
    
    private void processLast(String first, String second, String third) {
        System.debug(first + second + third);
    }
}

// Mock classes for testing
public class MyUtilityClass {
    public static void staticMethod(String param) {
        System.debug(param);
    }
}

public class MyClass {
    public MyClass(String param) {
        System.debug(param);
    }
}

// Mock classes for deeply nested chain test: a.b(c.d(e.f()).g.h()).i(j())
// Also used for chain after method call test: a.b.c(d()).e
public class TestChainA {
    public TestChainB b(TestChainG param) {
        return new TestChainB();
    }
    
    public TestChainB b() {
        return new TestChainB();
    }
}

public class TestChainB {
    public void i(TestChainJ param) {
        System.debug('i called');
    }
    
    public TestChainB c(TestChainD param) {
        return this;
    }
    
    public TestChainE e; // Property/field, not a method
}

public class TestChainC {
    public TestChainG d(TestChainF param) {
        return new TestChainG();
    }
}

public class TestChainE {
    public TestChainF f() {
        return new TestChainF();
    }
}

public class TestChainF {
    // Return type for TestChainE.f()
}

public class TestChainG {
    public TestChainG g() {
        return this;
    }
    
    public TestChainG h() {
        return this;
    }
}

public class TestChainJ {
    public void j() {
        System.debug('j called');
    }
}

// Mock classes for chain after method call test: a.b.c(d()).e
public class TestChainD {
    public void d() {
        System.debug('d called');
    }
}

