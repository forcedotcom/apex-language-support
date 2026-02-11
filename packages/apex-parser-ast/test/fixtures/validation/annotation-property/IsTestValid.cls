@IsTest
public class IsTestValid {
    @IsTest
    public static void testMethod1() {
    }

    @IsTest(seeAllData=true)
    public static void testMethod2() {
    }

    @IsTest(isParallel=true)
    public static void testMethod3() {
    }

    @IsTest(critical=true)
    public static void testMethod4() {
    }

    @IsTest(onInstall=true)
    public static void testMethod5() {
    }
}
