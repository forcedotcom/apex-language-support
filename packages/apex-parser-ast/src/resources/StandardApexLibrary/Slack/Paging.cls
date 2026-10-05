global class Paging {
    global Paging() { }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCount() { return 0; }

    global String getIid() { return null; }

    global Integer getPage() { return 0; }

    global Integer getPages() { return 0; }

    global Integer getPerPage() { return 0; }

    global Integer getSpill() { return 0; }

    global Integer getTotal() { return 0; }

    global virtual Integer hashCode() { return 0; }

    global void setCount(Integer count) { }

    global void setIid(String iid) { }

    global void setPage(Integer page) { }

    global void setPages(Integer pages) { }

    global void setPerPage(Integer perPage) { }

    global void setSpill(Integer spill) { }

    global void setTotal(Integer total) { }

    global override String toString() { return null; }
}