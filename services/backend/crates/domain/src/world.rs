//! The shared world: who is where, what the street has been given, and the rules for reading what a browser sends.
//! A browser is not trusted: everything in here turns loose input into values that are safe to store and show to others.
pub mod bins;
pub mod district;
pub mod efforts;
pub mod presence;
pub mod profile;
pub mod text;
