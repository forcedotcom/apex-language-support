public with sharing class ScopeExample {

    String a;

    static String b;

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

        String c = ScopeExample.method4();

    }

    public static String method4() {

        return ScopeExample.b;

    }

    public class InnerClass {

        public void method5() {

            String c = ScopeExample.method4();

        }

    }

}

