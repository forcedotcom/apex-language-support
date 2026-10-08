global interface Iterator {
    virtual Boolean equals(Object arg0);

    abstract Boolean hasNext();

    virtual Integer hashCode();

    abstract t next();

    virtual String toString();
}