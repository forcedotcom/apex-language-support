public class FutureInvalid {
    @Future(delay=-1)
    public static void method1() {
    }

    @Future(delay=1000)
    public static void method2() {
    }

    @Future(delay=50.5)
    public static void method3() {
    }

    @Future(limits='INVALID')
    public static void method4() {
    }
}
