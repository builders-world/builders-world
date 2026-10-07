//! The stable codes the API answers with when it refuses something, and the app turns into words. They are the one
//! list of what can go wrong on the wire: a variant here is a string a client may depend on, so renaming one is a
//! breaking change.
use serde::{Serialize, Serializer};

macro_rules! error_codes {
    ($($variant:ident => $text:literal,)+) => {
        /// Why the API refused something.
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub enum ErrorCode {
            $($variant,)+
        }

        impl ErrorCode {
            /// The code as it appears in the response.
            pub const fn as_str(self) -> &'static str {
                match self {
                    $(Self::$variant => $text,)+
                }
            }
        }
    };
}

error_codes! {
    NotFound => "not_found",
    BadRequest => "bad_request",
    RateLimited => "rate_limited",
    Unavailable => "unavailable",
    InternalError => "internal_error",
}

impl Serialize for ErrorCode {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_code_is_its_text_on_the_wire() {
        assert_eq!(serde_json::to_string(&ErrorCode::NotFound).unwrap(), "\"not_found\"");
    }
}
