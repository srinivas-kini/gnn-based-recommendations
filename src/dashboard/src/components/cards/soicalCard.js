import { Stack } from "react-bootstrap";
import Card from "react-bootstrap/Card";

function BgColorExample({ item, isLinkedIn, name }) {
  return (
    <>
      <Card
        style={{ minWidth: 400, border: "1px solid #1C9CEA", height: "100%" }}
      >
        <Card.Body className="d-flex flex-column">
          <Stack>
            <div className="d-flex gap-2 mb-3">
              <div className=" bg-info avatar">{name.slice(0, 1)}</div>
              <div>
                <Card.Title className="fs-6 fw-bold mb-0">
                  {/* {variant} */}
                  {name}{" "}
                </Card.Title>
                <Card.Text>{item.username || item.handle}</Card.Text>
              </div>
            </div>
            {item.title && (
              <Card.Text className="mb-1 fw-bold fs-6">{item.title}</Card.Text>
            )}
            <Card.Text className="mb-1">{item.text || item.content}</Card.Text>
            {/* <Card.Text className="mb-0">
              <a
                href={item.url}
                target="_blank"
                className="text-decoration-underline fw-bold"
                style={{
                  color: "#1C9CEA",
                }}
              >
                View more
              </a>
            </Card.Text> */}
          </Stack>
          <Stack
            className={`d-flex align-items-center flex-row gap-2 ${!isLinkedIn ? "justify-space-between" : "justify-content-end"
              }`}
            style={{
              maxHeight: 33,
              height: 33,
            }}
          >
            {!isLinkedIn && (
              <Stack className=" d-flex flex-row gap-2 align-items-center">
                <Card.Text className="mb-0">
                  <i class="fa fa-heart-o" aria-hidden="true"></i>{" "}
                  {item.favorites}
                </Card.Text>
                <Card.Text className="mb-0">
                  <i class="fa fa-retweet me-1" aria-hidden="true"></i>
                  {item.retweets}
                </Card.Text>
              </Stack>
            )}

            {isLinkedIn ? (
              <i
                class="fa fa-2x  fa-linkedin-square"
                aria-hidden="true"
                style={{
                  color: "#1C9CEA",
                }}
              ></i>
            ) : (
              <i
                class="fa fa-2x fa-twitter"
                aria-hidden="true"
                style={{
                  color: "#1C9CEA",
                }}
              ></i>
            )}
          </Stack>
        </Card.Body>
      </Card>
    </>
  );
}

export default BgColorExample;
