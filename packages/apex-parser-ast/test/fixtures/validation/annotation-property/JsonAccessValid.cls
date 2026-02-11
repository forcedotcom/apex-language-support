@JsonAccess(serializable='always', deserializable='never')
public class JsonAccessValid {
}

@JsonAccess(serializable='samePackage')
public class JsonAccessValid2 {
}

@JsonAccess(deserializable='sameNamespace')
public class JsonAccessValid3 {
}
