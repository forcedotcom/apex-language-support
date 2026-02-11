public class AllExpressionTypes {
    public void testAllExpressions() {
        // Variables for testing
        Integer a = 1;
        Integer b = 2;
        Integer c = 3;
        String s = 'Hello';
        Boolean flag = true;
        Long l = 100L;
        Decimal d = 1.5;
        
        // Nested arithmetic: (a + b) * c
        Integer result1 = (a + b) * c;
        
        // Multi-term: a + b + c (parsed as (a + b) + c)
        Integer result2 = a + b + c;
        
        // Deeply nested parentheses: (('foo') + ('bar')) + ('foo')
        String result3 = (('foo') + ('bar')) + ('foo');
        
        // Multiple nested groups: (a + b) + (c + d)
        Integer result4 = (a + b) + (c + 1);
        
        // Mixed operators with nesting: (x * y) + z
        Integer x = 2;
        Integer y = 3;
        Integer z = 4;
        Integer result5 = (x * y) + z;
        
        // Logical operators
        Boolean result6 = flag && true;
        Boolean result7 = flag || false;
        Boolean result8 = s ?? 'default';
        
        // Assignment operators
        Integer result9 = a += b;
        Integer result10 = a -= b;
        Integer result11 = a *= 2;
        Integer result12 = a /= 2;
        
        // Dot expressions
        Account acc = new Account();
        String name = acc.Name;
        
        // Array expressions
        List<Integer> list = new List<Integer>{1, 2, 3};
        Integer first = list[0];
        Integer second = list[1];
        Integer sum = list[0] + list[1];
        
        // Cast expressions
        Long longVal = (Long) a;
        Integer intVal = (Integer) l;
        Integer result13 = (Integer) l + a;
        
        // Unary operators
        Integer preInc = ++a;
        Integer postInc = a++;
        Integer preDec = --b;
        Integer postDec = b--;
        Boolean negated = !flag;
        Integer bitwiseNot = ~a;
        
        // InstanceOf
        Boolean isAccount = acc instanceof Account;
        
        // Ternary expressions
        Integer result14 = flag ? a : b;
        String result15 = flag ? s : 'default';
        
        // Deeply nested: ((a + b) * c) / d
        Decimal result16 = ((a + b) * c) / d;
        
        // Order of operations: (a + (b * c))
        Integer result17 = (a + (b * c));
        
        // Nested parentheses: ((x))
        Integer result18 = ((x));
        
        // Multiple nested groups: ((a)) + ((b))
        Integer result19 = ((a)) + ((b));
        
        // String concatenation patterns
        String result20 = s + ' World';
        String result21 = s + 123;
        String result22 = 'The value of a is: ' + a;
        String result23 = 'Hello' + ' World';
        String result24 = s + s;
    }
}
