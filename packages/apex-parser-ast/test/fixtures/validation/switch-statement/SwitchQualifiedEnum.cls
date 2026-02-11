public class SwitchQualifiedEnum {
    public enum MyEnum { A, B, C }
    public void m() {
        MyEnum e = MyEnum.A;
        switch on e {
            when MyEnum.A {}
            when MyEnum.B {}
            when MyEnum.C {}
        }
    }
}
