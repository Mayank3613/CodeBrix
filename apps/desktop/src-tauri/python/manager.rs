use std::process::{Command,Stdio};

pub fn start_python(){
    let child = Command::new("python")
        .arg("../../python/runner.py")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("Failed to start Python");
    
    println!("Python started: {:?}",child.id());
}