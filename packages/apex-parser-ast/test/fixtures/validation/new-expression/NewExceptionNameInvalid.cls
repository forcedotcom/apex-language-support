public class MyError extends Exception {
}

public class NewExceptionNameInvalid {
    void test() {
        throw new MyError();
    }
}
