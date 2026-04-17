public class EnrichmentTestClass {
    public void testColdStartQualifier() {
        // Standalone call — no LHS variable, so symbolRange of any local variable
        // does not cover the qualifier position. Used to test on-demand enrichment.
        FileUtilities.createFile('test.txt', 'Hello World');
    }
}
