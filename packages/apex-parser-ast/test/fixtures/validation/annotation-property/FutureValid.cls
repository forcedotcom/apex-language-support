public class FutureValid {
    @Future
    public static void method1() {
    }

    @Future(callout=true)
    public static void method2() {
    }

    @Future(delay=100)
    public static void method3() {
    }

    @Future(limits='HEAP501MB')
    public static void method4() {
    }

    @Future(delay=500, limits='2xHeap')
    public static void method5() {
    }
}
