import React from "react";
import { Form, FormControl, Button } from "react-bootstrap";

const SearchBar = ({ search, setsearch, onsubmit }) => {
  return (
    <Form
      onSubmit={(e) => onsubmit(e)}
      inline="true"
      className="d-flex justify-content-around container"
    >
      <FormControl
        type="text"
        required={true}
        value={search}
        onChange={(e) => setsearch(e.target.value)}
        placeholder="Search"
        className="mr-sm-2"
      />
      <Button variant="outline-info ms-3" type="submit">
        Search
      </Button>
    </Form>
  );
};

export default SearchBar;
