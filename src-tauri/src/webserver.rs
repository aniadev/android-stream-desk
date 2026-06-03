use include_dir::{include_dir, Dir};
use serde::Serialize;
use std::io::Cursor;
use tauri::Emitter;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

static CLIENT_DIST: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../dist-client");

#[derive(Clone, Debug)]
pub struct WebServerConfig {
    pub web_port: u16,
    pub ws_port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerInfoResponse {
    ws_port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebServerErrorPayload {
    port: u16,
    error: String,
    kind: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebServerReadyPayload {
    port: u16,
}

pub fn start_web_server(config: WebServerConfig, app_handle: tauri::AppHandle) {
    let addr = format!("0.0.0.0:{}", config.web_port);
    let server = match Server::http(&addr) {
        Ok(server) => server,
        Err(e) => {
            let msg = format!(
                "Failed to bind HTTP web server TCP port {}: {}",
                config.web_port, e
            );
            eprintln!("{}", msg);
            emit_web_error(&app_handle, config.web_port, msg);
            return;
        }
    };

    println!("HTTP web client server listening on http://{}", addr);
    let _ = app_handle.emit(
        "server-web-ready",
        WebServerReadyPayload {
            port: config.web_port,
        },
    );

    for request in server.incoming_requests() {
        handle_request(request, config.ws_port);
    }
}

fn emit_web_error(app_handle: &tauri::AppHandle, port: u16, error: String) {
    let payload = WebServerErrorPayload {
        port,
        error,
        kind: "web",
    };
    let _ = app_handle.emit("server-web-error", &payload);
    let _ = app_handle.emit("server-error", &payload);
}

fn handle_request(request: Request, ws_port: u16) {
    let url = request.url().to_string();
    let method = request.method().clone();

    let response = if method == Method::Options {
        preflight_response()
    } else if is_dashboard_request(&url) {
        text_response(StatusCode(403), "Forbidden")
    } else if request_path(&url) == "/api/server-info" {
        json_response(server_info_json(ws_port))
    } else {
        static_response(&url)
    };

    let _ = request.respond(response);
}

pub fn server_info_json(ws_port: u16) -> String {
    serde_json::to_string(&ServerInfoResponse { ws_port })
        .unwrap_or_else(|_| format!(r#"{{"wsPort":{}}}"#, ws_port))
}

fn request_path(url: &str) -> &str {
    url.split('?').next().unwrap_or(url)
}

fn is_dashboard_request(url: &str) -> bool {
    request_path(url)
        .to_ascii_lowercase()
        .contains("/dashboard")
}

fn static_asset_path(url: &str) -> String {
    let path = request_path(url).trim_start_matches('/');
    if path.is_empty() {
        "index.html".to_string()
    } else {
        path.to_string()
    }
}

fn static_response(url: &str) -> Response<Cursor<Vec<u8>>> {
    let asset_path = static_asset_path(url);
    let Some(file) = CLIENT_DIST.get_file(asset_path.as_str()) else {
        return text_response(StatusCode(404), "Not Found");
    };

    let mut response =
        Response::from_data(file.contents().to_vec()).with_status_code(StatusCode(200));
    add_header(
        &mut response,
        "Content-Type",
        content_type_for_path(&asset_path),
    );
    response
}

fn json_response(body: String) -> Response<Cursor<Vec<u8>>> {
    let mut response = Response::from_string(body).with_status_code(StatusCode(200));
    add_header(&mut response, "Content-Type", "application/json");
    add_cors_headers(&mut response);
    response
}

fn preflight_response() -> Response<Cursor<Vec<u8>>> {
    let mut response = Response::from_data(Vec::new()).with_status_code(StatusCode(204));
    add_cors_headers(&mut response);
    response
}

fn text_response(status: StatusCode, body: &str) -> Response<Cursor<Vec<u8>>> {
    let mut response = Response::from_string(body.to_string()).with_status_code(status);
    add_header(&mut response, "Content-Type", "text/plain; charset=utf-8");
    response
}

fn add_cors_headers(response: &mut Response<Cursor<Vec<u8>>>) {
    add_header(response, "Access-Control-Allow-Origin", "*");
    add_header(response, "Access-Control-Allow-Methods", "GET, OPTIONS");
    add_header(response, "Access-Control-Allow-Headers", "Content-Type");
}

fn add_header(response: &mut Response<Cursor<Vec<u8>>>, name: &str, value: &str) {
    if let Ok(header) = Header::from_bytes(name.as_bytes(), value.as_bytes()) {
        response.add_header(header);
    }
}

fn content_type_for_path(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or_default() {
        "css" => "text/css; charset=utf-8",
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "json" => "application/json",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "wav" => "audio/wav",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_info_json_should_return_ws_port_camel_case() {
        let body = server_info_json(18089);

        assert_eq!(body, r#"{"wsPort":18089}"#);
    }

    #[test]
    fn dashboard_paths_should_be_blocked() {
        assert!(is_dashboard_request("/dashboard"));
        assert!(is_dashboard_request("/nested/dashboard?from=test"));
    }

    #[test]
    fn static_asset_path_should_map_root_to_index() {
        assert_eq!(static_asset_path("/"), "index.html");
    }

    #[test]
    fn static_asset_path_should_strip_query_string() {
        assert_eq!(
            static_asset_path("/assets/client.js?v=1"),
            "assets/client.js"
        );
    }
}
