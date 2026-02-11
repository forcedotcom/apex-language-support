public class DataException {
    // Does NOT extend Exception - but name ends in Exception
}

public class NewNonExceptionNameEndsException {
    void test() {
        DataException d = new DataException();
    }
}
