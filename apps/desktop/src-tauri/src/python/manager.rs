use std::process::{Command,Stdio};

pub fn start_python(){

    let child = Command::new("config.python_path")
>>>>>>> 4f8385e1450dc56d6b241b3acbd752877dabaca8
        .arg("../../../python/runner.py")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("Failed to start Python");
    
    println!("Python started: {:?}",child.id());
}