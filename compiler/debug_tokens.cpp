#include "tokenizer.h"
#include <iostream>

using namespace cardity;

int main() {
    std::string source = R"(
protocol hello_cardinals {
  version: "1.0";
  owner: "doge1abc...";

  state {
    msg: string = "Hello, Cardinals!";
  }

  method set_msg(new_msg) {
    state.msg = new_msg;
  }

  method get_msg() {
    return state.msg;
  }
}
)";
    
    Tokenizer tokenizer(source);
    int i = 0;
    
    std::cout << "Token stream:" << std::endl;
    while (tokenizer.has_more_tokens()) {
        Token token = tokenizer.next_token();
        std::cout << i++ << ": " << token.value << " (Type: " << static_cast<int>(token.type) 
                  << ") at " << token.line << ":" << token.column << std::endl;
        
        if (token.type == TokenType::END_OF_FILE) break;
    }
    
    return 0;
} 