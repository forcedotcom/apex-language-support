@IsTest
public class TestClassWithoutTestMethod {
    public void notATestMethod() {
        // No @IsTest - should trigger MODIFIER_REQUIRE_AT_LEAST
    }
}
