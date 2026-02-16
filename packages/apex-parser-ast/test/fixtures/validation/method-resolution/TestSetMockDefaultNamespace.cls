/**
 * Test.startTest()/stopTest() in @isTest class.
 * With default/empty namespace, should resolve to System.Test (not Canvas.Test).
 */
@isTest
private class TestSetMockDefaultNamespace {
    @isTest
    static void testResolvesToSystemTest() {
        Test.startTest();
        Test.stopTest();
    }
}
