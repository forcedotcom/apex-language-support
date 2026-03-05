/**
 * Reproduces dreamhouse FileUtilitiesTest.cls patterns for TDD debugging.
 * Assert.isNotNull(String) and Assert.isInstanceOfType(e, AuraHandledException.class)
 * must NOT produce method.does.not.support.parameter.type.
 */
@isTest
private class AssertDreamhouseStyle {
    @isTest
    static void isNotNullWithString() {
        String contentDocumentLinkId = 'test-id';
        Assert.isNotNull(contentDocumentLinkId);
    }

    @isTest
    static void isInstanceOfTypeWithAuraHandledException() {
        try {
            throw new AuraHandledException('expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(e, AuraHandledException.class);
        }
    }
}
