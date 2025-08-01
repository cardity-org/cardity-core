#ifndef CARDITY_CAR_GENERATOR_AST_H
#define CARDITY_CAR_GENERATOR_AST_H

#include "parser_ast.h"
#include <nlohmann/json.hpp>
#include <string>

namespace cardity {
using json = nlohmann::json;

json generate_car_json(const ProtocolAST& ast);
void write_car_file(const json& j, const std::string& filename);

} // namespace cardity

#endif // CARDITY_CAR_GENERATOR_AST_H